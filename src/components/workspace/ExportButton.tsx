import { Download } from 'lucide-react';
import { Button } from '../Button';

export function ExportButton({
  onExport,
  disabled,
}: {
  onExport: () => void;
  disabled?: boolean;
}): React.JSX.Element {
  return (
    <Button
      variant="icon"
      size="sm"
      className="h-9 w-9 rounded-xl p-0"
      aria-label="Export transcript"
      disabled={disabled}
      onClick={onExport}
    >
      <Download className="h-4 w-4" />
    </Button>
  );
}
