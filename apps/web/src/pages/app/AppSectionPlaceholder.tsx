type Props = {
  title: string;
  description: string;
};

export function AppSectionPlaceholder(props: Props) {
  return (
    <section className="dash-panel" aria-labelledby="app-section-title">
      <h2 id="app-section-title">{props.title}</h2>
      <p className="dash-panel__empty">{props.description}</p>
    </section>
  );
}
