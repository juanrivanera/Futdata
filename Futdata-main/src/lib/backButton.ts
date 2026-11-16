// Botón "atrás" de Android (solo en la app instalada). Cada pantalla o ventana abierta registra
// cómo cerrarse; al presionar atrás se ejecuta la última registrada. En la web no se usa.
type Handler = () => void;
const stack: Handler[] = [];

export function registerBackHandler(fn: Handler) {
  stack.push(fn);
  return () => {
    const i = stack.lastIndexOf(fn);
    if (i >= 0) stack.splice(i, 1);
  };
}

export function runBackHandler() {
  const fn = stack[stack.length - 1];
  if (!fn) return false;
  fn();
  return true;
}
