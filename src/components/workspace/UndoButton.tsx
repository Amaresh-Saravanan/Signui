import { Undo2 } from 'lucide-react';
import { Button } from '../Button';

/** Icon button that removes the last committed word from the transcript. */
export function UndoButton({
  onUndo,
  disabled,
}: {
  onUndo: () => void;
  disabled?: boolean;
}): React.JSX.Element {
  return (
    <Button
      variant="icon"
      size="sm"
      className="h-9 w-9 rounded-xl p-0"
      onClick={onUndo}
      disabled={disabled}
      aria-label="Undo last word"
    >
      <Undo2 className="h-4 w-4" />
    </Button>
  );
}
