# ClayFlow design tokens

## Motion

`src/motion/tokens.ts` exports the timing defaults as milliseconds and their supported design ranges. `MOTION_CSS` publishes the defaults as scoped custom properties on `.cf`; reduced-motion media queries set each duration to zero. `EASE` exposes the standard, emphasized, and exit cubic-bezier curves.

| Token | Range | Default | Use |
| --- | ---: | ---: | --- |
| activation | 250–400 ms | 320 ms | State and emphasis changes |
| lift | 300–450 ms | 380 ms | Node lift and hover response |
| transform | 500–850 ms | 680 ms | Node kind or label changes |
| connector | 400–700 ms | 560 ms | Connector color and state |
| packet | 700–1500 ms | 1100 ms | Packet travel |
| group | 400–650 ms | 520 ms | Group state |
| status | 250–450 ms | 340 ms | Visibility and status changes |
| scene | 600–1000 ms | 800 ms | Default timeline frame |

The CSS properties are named `--cf-dur-{token}` and `--cf-ease-{name}`. Components use the scoped values so theme changes do not affect playback state.
