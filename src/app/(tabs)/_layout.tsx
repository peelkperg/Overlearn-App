import AppTabs from '@/components/app-tabs';

// The tab bar itself. Nested under a Stack in the root `_layout.tsx` so that
// routes outside the tab set (segment/new, segment/[id], session/[id]) can
// be reached with router.push: a bare NativeTabs at the app root has no
// Stack ancestor to handle the PUSH action, so it's silently dropped.
export default function TabsLayout() {
  return <AppTabs />;
}
