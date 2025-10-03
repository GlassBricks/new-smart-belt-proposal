interface Script {
  register_metatable(this: void, name: string, prototype: any): void
}
export function tryRegister<T extends Function>(
  this: unknown,
  class_: T,
): void {
  ;((globalThis as any).script as Script | undefined)?.register_metatable?.(
    class_.name,
    class_.prototype,
  )
}
