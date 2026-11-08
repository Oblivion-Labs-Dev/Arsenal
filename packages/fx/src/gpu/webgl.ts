/**
 * Compiles and links a WebGL2 program. Throws with the driver's info log on failure, so a broken
 * shader is reported, not silently drawn as nothing. Shaders are released once linked.
 */
export function compileProgram(
  gl: WebGL2RenderingContext,
  vertex: string,
  fragment: string,
): WebGLProgram {
  const program = gl.createProgram();
  if (!program) throw new Error('WebGL2: could not create a program');
  const shaders: WebGLShader[] = [];
  for (const [type, source, label] of [
    [gl.VERTEX_SHADER, vertex, 'vertex'],
    [gl.FRAGMENT_SHADER, fragment, 'fragment'],
  ] as const) {
    const shader = gl.createShader(type);
    if (!shader) throw new Error(`WebGL2: could not create a ${label} shader`);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader) ?? 'no info log';
      gl.deleteShader(shader);
      gl.deleteProgram(program);
      throw new Error(`WebGL2 ${label} shader failed to compile: ${log}`);
    }
    gl.attachShader(program, shader);
    shaders.push(shader);
  }
  gl.linkProgram(program);
  for (const shader of shaders) {
    gl.detachShader(program, shader);
    gl.deleteShader(shader);
  }
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? 'no info log';
    gl.deleteProgram(program);
    throw new Error(`WebGL2 program failed to link: ${log}`);
  }
  return program;
}

/** Reports a rendering error: to `onError` when given, and always to the console. */
export function reportFxError(
  scope: string,
  error: unknown,
  onError?: (error: Error) => void,
): Error {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error(`[@arsenal/fx] ${scope}:`, err);
  onError?.(err);
  return err;
}
