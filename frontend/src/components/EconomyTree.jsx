export function EconomyTree({ node, selectedId, onSelect }) {
  if (!node) {
    return null;
  }

  return (
    <ul className="economy-tree">
      <EconomyNode node={node} selectedId={selectedId} onSelect={onSelect} />
    </ul>
  );
}

function EconomyNode({ node, selectedId, onSelect }) {
  const selected = node.id === selectedId;

  return (
    <li>
      <button
        className={selected ? 'node node-selected' : 'node'}
        type="button"
        onClick={() => onSelect(node)}
      >
        <span>
          <strong>{node.name}</strong>
          <small>{node.type}</small>
        </span>
        <b>{format(node.recursiveTotals.goods)} goods</b>
      </button>
      {node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <EconomyNode key={child.id} node={child} selectedId={selectedId} onSelect={onSelect} />
          ))}
        </ul>
      )}
    </li>
  );
}

function format(value) {
  return new Intl.NumberFormat('en', {
    maximumFractionDigits: 1
  }).format(value ?? 0);
}
