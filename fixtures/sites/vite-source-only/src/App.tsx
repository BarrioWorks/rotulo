const classes = [
  { name: "Little Splashers", ages: "3 to 5", detail: "Water confidence through play." },
  { name: "Stroke School", ages: "6 to 12", detail: "Freestyle, backstroke and breaststroke." },
  { name: "Adult Beginners", ages: "16+", detail: "Small groups, patient coaches, warm water." },
];

export default function App() {
  return (
    <main>
      <section className="hero">
        <h1>Learn to swim with Tidepool</h1>
        <p>Friendly lessons for every age in a heated indoor pool.</p>
        <a className="button" href="#classes">See classes</a>
      </section>
      <section id="classes" className="classes">
        {classes.map((c) => (
          <article key={c.name}>
            <h2>{c.name}</h2>
            <p className="ages">Ages {c.ages}</p>
            <p>{c.detail}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
