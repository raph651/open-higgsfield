interface LogoProps {
  compact?: boolean;
}

export function Logo({ compact = false }: LogoProps) {
  return (
    <span className={`logo ${compact ? 'logo--compact' : ''}`} aria-label="Framegraph">
      <span className="logo__mark" aria-hidden="true">
        <span className="logo__slice logo__slice--a" />
        <span className="logo__slice logo__slice--b" />
        <span className="logo__slice logo__slice--c" />
      </span>
      {!compact && (
        <span className="logo__word">
          FRAME<span>/</span>GRAPH
        </span>
      )}
    </span>
  );
}
