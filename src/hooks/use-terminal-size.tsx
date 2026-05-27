import { useStdout } from "ink";
import { useEffect, useState } from "react";

type TerminalSize = {
  width: number;
  height: number;
};

export function useTerminalSize(): TerminalSize {
  const { stdout } = useStdout();

  const getSize = () => ({
    width: stdout.columns ?? 80,
    height: stdout.rows ?? 24,
  });

  const [size, setSize] = useState<TerminalSize>(getSize);

  useEffect(() => {
    const onResize = () => {
      setSize(getSize());
    };

    stdout.on("resize", onResize);

    return () => {
      stdout.off("resize", onResize);
    };
  }, [stdout]);

  return size;
}
