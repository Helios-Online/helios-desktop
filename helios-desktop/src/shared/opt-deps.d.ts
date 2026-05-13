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
    install(): void;
    start(): void;
    stop(): void;
    uninstall(): void;
  }
  interface NodeWindows {
    Service: new (config: ServiceConfig) => ServiceHandle;
    EventLogger: new (config: { source: string }) => void;
    elevate(cmd: string, options?: Record<string, unknown>, callback?: () => void): void;
    sudo(cmd: string, options?: Record<string, unknown>, callback?: () => void): void;
  }
  const nw: NodeWindows;
  export = nw;
}

declare module 'node-mac' {
  const nodeMac: unknown;
  export default nodeMac;
}

declare module 'node-linux' {
  const nodeLinux: unknown;
  export default nodeLinux;
}
