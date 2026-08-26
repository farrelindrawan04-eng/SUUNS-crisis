const labels = {
  money: 'Money',
  labor: 'Labor',
  goods: 'Goods',
  energy: 'Energy',
  knowledge: 'Knowledge'
};

export function MetricStrip({ totals }) {
  return (
    <section className="metric-strip">
      {Object.entries(labels).map(([key, label]) => (
        <article className="metric" key={key}>
          <span>{label}</span>
          <strong>{format(totals?.[key] ?? 0)}</strong>
        </article>
      ))}
    </section>
  );
}

function format(value) {
  return new Intl.NumberFormat('en', {
    maximumFractionDigits: 2
  }).format(value);
}
