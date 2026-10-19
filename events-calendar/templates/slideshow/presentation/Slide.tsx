import "./slides.css";

// Author the visual here. Only the server's slide-only projection reaches this component.
export function Slide({
  slide,
  title,
  index,
  count,
}: {
  slide: { title: string; body: string };
  title: string;
  index: number;
  count: number;
}) {
  return (
    <article className="slideshow-slide">
      <p className="slideshow-eyebrow">{title}</p>
      <h1>{slide.title}</h1>
      <p>{slide.body}</p>
      <footer>
        {index + 1} / {count}
      </footer>
    </article>
  );
}
