//! A bounded ZIP reader. Archive names are metadata, never filesystem paths.
use super::ImportError;
use crate::settings::Limits;
use flate2::{bufread::DeflateDecoder, Crc};
use std::{
    collections::BTreeMap,
    fs::File,
    io::{Read, Seek, SeekFrom, Write},
    path::Path,
};

fn bad() -> ImportError {
    ImportError::InvalidArchive
}
fn u16_at(b: &[u8], n: usize) -> u16 {
    u16::from_le_bytes([b[n], b[n + 1]])
}
fn u32_at(b: &[u8], n: usize) -> u32 {
    u32::from_le_bytes([b[n], b[n + 1], b[n + 2], b[n + 3]])
}
fn extra(mut b: &[u8]) -> Result<(), ImportError> {
    while !b.is_empty() {
        if b.len() < 4 {
            return Err(bad());
        }
        let size = usize::from(u16_at(b, 2));
        if u16_at(b, 0) == 1 || size > b.len() - 4 {
            return Err(bad());
        }
        b = &b[4 + size..];
    }
    Ok(())
}

#[derive(Debug, Clone)]
pub struct Entry {
    pub path: String,
    pub directory: bool,
    pub size: u64,
    compressed: u64,
    offset: u64,
    data: u64,
    crc: u32,
    method: u16,
    flags: u16,
}

pub struct Archive {
    file: File,
    pub entries: Vec<Entry>,
}

pub fn normalize(name: &str, limits: &Limits) -> Result<String, ImportError> {
    let path = name.strip_suffix('/').unwrap_or(name);
    let segments: Vec<_> = path.split('/').collect();
    if name.len() > 1024
        || name.starts_with('/')
        || name.contains(['\\', ':'])
        || name.chars().any(char::is_control)
        || segments.len() > limits.depth
        || segments
            .iter()
            .any(|s| s.is_empty() || *s == "." || *s == ".." || s.len() > 255)
    {
        return Err(ImportError::UnsafePath(name.to_owned()));
    }
    Ok(path.to_owned())
}

impl Archive {
    pub fn open(path: &Path, limits: &Limits) -> Result<Self, ImportError> {
        let mut file = File::open(path)?;
        let len = file.metadata()?.len();
        if len > limits.upload_bytes {
            return Err(ImportError::Limit);
        }
        let tail_len = len.min(65_557) as usize;
        file.seek(SeekFrom::End(-(tail_len as i64)))?;
        let mut tail = vec![0; tail_len];
        file.read_exact(&mut tail)?;
        let ends: Vec<_> = (0..tail.len().saturating_sub(21))
            .filter(|&i| {
                tail[i..i + 4] == *b"PK\x05\x06"
                    && i + 22 + usize::from(u16_at(&tail, i + 20)) == tail.len()
            })
            .collect();
        if ends.len() != 1 {
            return Err(bad());
        }
        let pos = ends[0];
        let end = &tail[pos..pos + 22];
        let eocd = len - tail_len as u64 + pos as u64;
        // Check on disk as the locator can fall outside the bounded search window
        // when the archive carries a maximum-length comment.
        if eocd >= 20 {
            file.seek(SeekFrom::Start(eocd - 20))?;
            let mut locator = [0; 4];
            file.read_exact(&mut locator)?;
            if locator == *b"PK\x06\x07" {
                return Err(bad());
            }
        }
        let count = u16_at(end, 10);
        let cd_size = u32_at(end, 12);
        let cd_start = u32_at(end, 16);
        if u16_at(end, 4) != 0
            || u16_at(end, 6) != 0
            || u16_at(end, 8) != count
            || count == u16::MAX
            || cd_size == u32::MAX
            || cd_start == u32::MAX
            || u64::from(cd_start) + u64::from(cd_size) != eocd
        {
            return Err(bad());
        }
        if usize::from(count) > limits.file_count {
            return Err(ImportError::Limit);
        }
        if count == 0 {
            return Err(ImportError::Empty);
        }
        file.seek(SeekFrom::Start(u64::from(cd_start)))?;
        let mut entries = Vec::with_capacity(usize::from(count));
        let mut paths = BTreeMap::new();
        let mut total = 0u64;
        for _ in 0..count {
            if file
                .stream_position()?
                .checked_add(46)
                .is_none_or(|p| p > eocd)
            {
                return Err(bad());
            }
            let mut h = [0; 46];
            file.read_exact(&mut h)?;
            if &h[..4] != b"PK\x01\x02" {
                return Err(bad());
            }
            let flags = u16_at(&h, 8);
            let method = u16_at(&h, 10);
            let compressed = u32_at(&h, 20);
            let size = u32_at(&h, 24);
            let offset = u32_at(&h, 42);
            if flags & 0x41 != 0 {
                return Err(ImportError::Encrypted);
            }
            if ![0, 8].contains(&method) {
                return Err(ImportError::Compression);
            }
            if [compressed, size, offset].contains(&u32::MAX) || u16_at(&h, 34) != 0 {
                return Err(bad());
            }
            let variable =
                u64::from(u16_at(&h, 28)) + u64::from(u16_at(&h, 30)) + u64::from(u16_at(&h, 32));
            if file
                .stream_position()?
                .checked_add(variable)
                .is_none_or(|p| p > eocd)
            {
                return Err(bad());
            }
            let mut name = vec![0; usize::from(u16_at(&h, 28))];
            file.read_exact(&mut name)?;
            if flags & 0x800 == 0 && !name.is_ascii() {
                return Err(bad());
            }
            let name = String::from_utf8(name).map_err(|_| bad())?;
            let directory = name.ends_with('/');
            let path = normalize(&name, limits)?;
            let mode = u32_at(&h, 38) >> 16;
            if h[5] == 3 && !matches!(mode & 0o170000, 0o100000 | 0o040000) {
                return Err(ImportError::UnsafePath(name));
            }
            if h[5] == 3
                && ((mode & 0o170000 == 0o040000 && !directory)
                    || (mode & 0o170000 == 0o100000 && directory))
            {
                return Err(bad());
            }
            if paths.insert(path.to_ascii_lowercase(), directory).is_some() {
                return Err(ImportError::UnsafePath(name));
            }
            let mut extras = vec![0; usize::from(u16_at(&h, 30))];
            file.read_exact(&mut extras)?;
            extra(&extras)?;
            file.seek(SeekFrom::Current(i64::from(u16_at(&h, 32))))?;
            total = total
                .checked_add(u64::from(size))
                .ok_or(ImportError::Limit)?;
            if u64::from(size) > limits.file_bytes
                || total > limits.content_bytes
                || (size > 1024 * 1024
                    && u64::from(size)
                        > u64::from(compressed).saturating_mul(limits.compression_ratio))
            {
                return Err(ImportError::Limit);
            }
            if directory && (size != 0 || compressed != 0) {
                return Err(bad());
            }
            entries.push(Entry {
                path,
                directory,
                size: u64::from(size),
                compressed: u64::from(compressed),
                offset: u64::from(offset),
                data: 0,
                crc: u32_at(&h, 16),
                method,
                flags,
            });
        }
        if file.stream_position()? != eocd {
            return Err(bad());
        }
        for path in paths.keys() {
            for (i, _) in path.match_indices('/') {
                if paths.get(&path[..i]) == Some(&false) {
                    return Err(ImportError::UnsafePath(path.clone()));
                }
            }
        }
        entries.sort_by_key(|e| e.offset);
        if entries[0].offset != 0 {
            return Err(bad());
        }
        for i in 0..entries.len() {
            let boundary = entries.get(i + 1).map_or(u64::from(cd_start), |e| e.offset);
            let e = &mut entries[i];
            if e.offset.checked_add(30).is_none_or(|p| p > boundary) {
                return Err(bad());
            }
            file.seek(SeekFrom::Start(e.offset))?;
            let mut h = [0; 30];
            file.read_exact(&mut h)?;
            if &h[..4] != b"PK\x03\x04"
                || u16_at(&h, 8) != e.method
                || u16_at(&h, 6) != e.flags
                || u32_at(&h, 18) == u32::MAX
                || u32_at(&h, 22) == u32::MAX
            {
                return Err(bad());
            }
            let data = e.offset + 30 + u64::from(u16_at(&h, 26)) + u64::from(u16_at(&h, 28));
            if data.checked_add(e.compressed).is_none_or(|p| p > boundary) {
                return Err(bad());
            }
            let mut name = vec![0; usize::from(u16_at(&h, 26))];
            file.read_exact(&mut name)?;
            let expected = format!("{}{}", e.path, if e.directory { "/" } else { "" });
            if name != expected.as_bytes() {
                return Err(bad());
            }
            let mut extras = vec![0; usize::from(u16_at(&h, 28))];
            file.read_exact(&mut extras)?;
            extra(&extras)?;
            if e.flags & 8 == 0
                && (u32_at(&h, 14) != e.crc
                    || u64::from(u32_at(&h, 18)) != e.compressed
                    || u64::from(u32_at(&h, 22)) != e.size)
            {
                return Err(bad());
            }
            e.data = data;
        }
        Ok(Self { file, entries })
    }

    pub fn extract(
        &mut self,
        index: usize,
        limits: &Limits,
        total: &mut u64,
        out: &mut impl Write,
    ) -> Result<(), ImportError> {
        let e = &self.entries[index];
        self.file.seek(SeekFrom::Start(e.data))?;
        let source = (&mut self.file).take(e.compressed);
        let mut crc = Crc::new();
        let mut size = 0u64;
        let mut pump = |reader: &mut dyn Read| -> Result<(), ImportError> {
            let mut buffer = [0; 16 * 1024];
            loop {
                let n = reader.read(&mut buffer).map_err(|_| bad())?;
                if n == 0 {
                    break;
                }
                size += n as u64;
                *total = total.checked_add(n as u64).ok_or(ImportError::Limit)?;
                if size > e.size || size > limits.file_bytes || *total > limits.content_bytes {
                    return Err(ImportError::Limit);
                }
                crc.update(&buffer[..n]);
                out.write_all(&buffer[..n])?;
            }
            Ok(())
        };
        if e.method == 0 {
            pump(&mut { source })?;
        } else {
            let mut decoder = DeflateDecoder::new(std::io::BufReader::new(source));
            pump(&mut decoder)?;
            if decoder.total_in() != e.compressed {
                return Err(bad());
            }
        }
        if size != e.size || crc.sum() != e.crc {
            return Err(bad());
        }
        Ok(())
    }

    pub fn read(
        &mut self,
        index: usize,
        limits: &Limits,
        total: &mut u64,
    ) -> Result<Vec<u8>, ImportError> {
        let mut bytes = Vec::new();
        self.extract(index, limits, total, &mut bytes)?;
        Ok(bytes)
    }
}
