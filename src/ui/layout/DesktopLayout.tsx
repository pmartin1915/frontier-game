import { useState } from 'react';
import { Layout, Model } from 'flexlayout-react';
import type { TabNode } from 'flexlayout-react';
import type { IJsonModel } from 'flexlayout-react';
import 'flexlayout-react/style/light.css';

import TravelLog from '@/ui/panels/TravelLog';
import AnimationPanel from '@/ui/panels/AnimationPanel';
import HUD from '@/ui/panels/HUD';
import MapPanel from '@/ui/panels/MapPanel';
import { colors } from '@/ui/theme';

const LAYOUT_JSON: IJsonModel = {
  global: {
    tabEnableClose: false,
    tabEnableRename: false,
    tabSetEnableMaximize: true,
    tabSetEnableSingleTabStretch: true,
    splitterSize: 6,
    splitterEnableHandle: true,
    tabSetMinHeight: 60,
    tabSetMinWidth: 60,
  },
  layout: {
    type: 'row',
    children: [
      {
        type: 'tabset',
        weight: 50,
        children: [
          { type: 'tab', name: 'Travel Log', component: 'travelLog' },
        ],
      },
      {
        type: 'row',
        weight: 50,
        children: [
          {
            type: 'tabset',
            weight: 50,
            children: [
              { type: 'tab', name: 'Animation', component: 'animation' },
            ],
          },
          {
            type: 'tabset',
            weight: 25,
            children: [
              { type: 'tab', name: 'HUD', component: 'hud' },
            ],
          },
          {
            type: 'tabset',
            weight: 25,
            children: [
              { type: 'tab', name: 'Map', component: 'map' },
            ],
          },
        ],
      },
    ],
  },
};

function panelFactory(node: TabNode): React.ReactNode {
  switch (node.getComponent()) {
    case 'travelLog':
      return <TravelLog />;
    case 'animation':
      return (
        <div style={{ background: colors.text, width: '100%', height: '100%' }}>
          <AnimationPanel />
        </div>
      );
    case 'hud':
      return (
        <div style={{ padding: '12px', overflow: 'auto', height: '100%' }}>
          <HUD />
        </div>
      );
    case 'map':
      return (
        <div style={{ padding: '12px', overflowY: 'auto', height: '100%' }}>
          <MapPanel />
        </div>
      );
    default:
      return null;
  }
}

export default function DesktopLayout() {
  const [model] = useState(() => Model.fromJson(LAYOUT_JSON));
  return <Layout model={model} factory={panelFactory} />;
}
