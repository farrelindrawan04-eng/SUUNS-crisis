const resourceOrder = ['money', 'labor', 'goods', 'energy', 'knowledge'];

export function Inspector({ node }) {
  if (!node) {
    return <aside className="inspector" />;
  }

  return (
    <aside className="inspector">
      <div className="inspector-heading">
        <span>{node.type}</span>
        <h2>{node.name}</h2>
      </div>

      <ResourceTable title="Direct Resources" values={node.resources} />
      <ResourceTable title="Recursive Totals" values={node.recursiveTotals} />
    </aside>
  );
}

function ResourceTable({ title, values }) {
  return (
    <section>
      <h3>{title}</h3>
      <dl className="resource-grid">
        {resourceOrder.map((resource) => (
          <div key={resource}>
            <dt>{resource}</dt>
            <dd>{format(values?.[resource] ?? 0)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function format(value) {
  return new Intl.NumberFormat('en', {
    maximumFractionDigits: 2
  }).format(value);
}
