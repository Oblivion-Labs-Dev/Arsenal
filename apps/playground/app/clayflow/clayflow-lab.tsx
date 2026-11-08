'use client';

import { ClayFlowGallery } from '@arsenal/clayflow/react';
import '@arsenal/clayflow/react.css';

export function ClayFlowLab() {
  return (
    <ClayFlowGallery
      headerAction={
        <a className="cfg-showcase-link" href="/clayflow/showcase">
          Animation showcase
        </a>
      }
    />
  );
}
