export interface PluginComponent {
  id: string;
  exportName: string;
}

export interface PluginRoute {
  path: string;
  component: string;
}

export interface PluginAdapter {
  id: string;
  setup: string;
}

export interface ArsenalPlugin<TConfig extends Record<string, unknown> = Record<string, unknown>> {
  name: string;
  version?: string;
  components?: PluginComponent[];
  routes?: PluginRoute[];
  adapters?: PluginAdapter[];
  config?: TConfig;
  dependencies?: string[];
}

export function definePlugin<TConfig extends Record<string, unknown> = Record<string, unknown>>(
  plugin: ArsenalPlugin<TConfig>,
): ArsenalPlugin<TConfig> {
  if (!plugin.name.trim()) throw new Error("Plugin name is required");
  return plugin;
}

export interface MergedPluginSurface {
  components: PluginComponent[];
  routes: PluginRoute[];
  adapters: PluginAdapter[];
  config: Record<string, unknown>;
  pluginNames: string[];
}

/** Merge multiple plugins into a single install surface for a project. */
export function mergePlugins(plugins: ArsenalPlugin[]): MergedPluginSurface {
  const components: PluginComponent[] = [];
  const routes: PluginRoute[] = [];
  const adapters: PluginAdapter[] = [];
  const config: Record<string, unknown> = {};
  const pluginNames: string[] = [];

  for (const plugin of plugins) {
    pluginNames.push(plugin.name);
    if (plugin.components) components.push(...plugin.components);
    if (plugin.routes) routes.push(...plugin.routes);
    if (plugin.adapters) adapters.push(...plugin.adapters);
    if (plugin.config) config[plugin.name] = plugin.config;
  }

  return { components, routes, adapters, config, pluginNames };
}
