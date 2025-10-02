interface Script {
  register_metatable(name: string, prototype: any): void
}
function tryRegister<T extends Function>(class_: T): void {
  ;((globalThis as any).script as Script | undefined)?.register_metatable?.(
    class_.name,
    class_.prototype,
  )
}
