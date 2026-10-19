//! Deliberately small test writer with independently corruptible headers.
use flate2::{write::DeflateEncoder, Compression, Crc};
use std::io::Write;
#[derive(Clone)]
pub struct Item {
    pub name: String,
    pub body: Vec<u8>,
    pub method: u16,
    pub flags: u16,
    pub mode: u32,
    pub local_name: Option<String>,
    pub declared: Option<u32>,
    pub crc: Option<u32>,
    pub offset: Option<u32>,
}
impl Item {
    pub fn new(name: &str, body: impl AsRef<[u8]>) -> Self {
        Self {
            name: name.to_owned(),
            body: body.as_ref().to_vec(),
            method: 0,
            flags: 0,
            mode: 0o100644,
            local_name: None,
            declared: None,
            crc: None,
            offset: None,
        }
    }
    pub fn deflated(mut self) -> Self {
        self.method = 8;
        self
    }
}
fn put16(out: &mut Vec<u8>, n: u16) {
    out.extend(n.to_le_bytes());
}
fn put32(out: &mut Vec<u8>, n: u32) {
    out.extend(n.to_le_bytes());
}
pub fn build(items: &[Item]) -> Vec<u8> {
    let mut out = Vec::new();
    let mut central = Vec::new();
    for item in items {
        let offset = item.offset.unwrap_or(out.len() as u32);
        let local = item.local_name.as_deref().unwrap_or(&item.name);
        let mut crc = Crc::new();
        crc.update(&item.body);
        let crc = item.crc.unwrap_or(crc.sum());
        let size = item.declared.unwrap_or(item.body.len() as u32);
        let bytes = if item.method == 8 {
            let mut e = DeflateEncoder::new(Vec::new(), Compression::default());
            e.write_all(&item.body).unwrap();
            e.finish().unwrap()
        } else {
            item.body.clone()
        };
        put32(&mut out, 0x04034b50);
        put16(&mut out, 20);
        put16(&mut out, item.flags);
        put16(&mut out, item.method);
        put32(&mut out, 0);
        put32(&mut out, crc);
        put32(&mut out, bytes.len() as u32);
        put32(&mut out, size);
        put16(&mut out, local.len() as u16);
        put16(&mut out, 0);
        out.extend(local.as_bytes());
        out.extend(&bytes);
        put32(&mut central, 0x02014b50);
        put16(&mut central, 0x0314);
        put16(&mut central, 20);
        put16(&mut central, item.flags);
        put16(&mut central, item.method);
        put32(&mut central, 0);
        put32(&mut central, crc);
        put32(&mut central, bytes.len() as u32);
        put32(&mut central, size);
        put16(&mut central, item.name.len() as u16);
        put16(&mut central, 0);
        put16(&mut central, 0);
        put16(&mut central, 0);
        put16(&mut central, 0);
        put32(&mut central, item.mode << 16);
        put32(&mut central, offset);
        central.extend(item.name.as_bytes());
    }
    let start = out.len() as u32;
    out.extend(&central);
    put32(&mut out, 0x06054b50);
    put16(&mut out, 0);
    put16(&mut out, 0);
    put16(&mut out, items.len() as u16);
    put16(&mut out, items.len() as u16);
    put32(&mut out, central.len() as u32);
    put32(&mut out, start);
    put16(&mut out, 0);
    out
}
