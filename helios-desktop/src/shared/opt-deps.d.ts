declare module 'node-windows' {
  interface ServiceConfig {
    name: string;
    description: string;
    script: string;
    nodeOptions?: string[];
    logpath?: string;
  }
  interface Service {
    on(event: 'install', listener: () => void): this;
    on(event: 'error', listener: (err: Error) => void): this;
  }
  const Service: new (config: ServiceConfig) => Service;
  export { Service, ServiceConfig };
}

declare module 'node-mac' {
  const nodeMac: unknown;
  export default nodeMac;
}

declare module 'node-linux' {
  const nodeLinux: unknown;
  export default nodeLinux;
}
