declare module 'node-windows' {
  interface ServiceConfig {
    name: string;
    description: string;
    script: string;
    nodeOptions?: string[];
    logpath?: string;
  }
  interface ServiceHandle {
    on(event: string, listener: (...args: any[]) => void): this;
  }
  const Service: new (config: ServiceConfig) => ServiceHandle;
  export = Service;
}

declare module 'node-mac' {
  const nodeMac: unknown;
  export default nodeMac;
}

declare module 'node-linux' {
  const nodeLinux: unknown;
  export default nodeLinux;
}
