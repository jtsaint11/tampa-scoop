import { SpaceSession, SpaceSessionRequired } from "@/auth/SpaceSession";
import { ViktorSpacePreviewBadge } from "@/components/ViktorSpacePreviewBadge";
import { ViktorSpaceAccessProvider } from "@/lib/viktor-spaces-access/ViktorSpaceAccessProvider";
import { Presentation } from "./Presentation";

export default function App() {
  return (
    <ViktorSpaceAccessProvider>
      <SpaceSession>
        <SpaceSessionRequired>
          <Presentation />
        </SpaceSessionRequired>
      </SpaceSession>
      <ViktorSpacePreviewBadge />
    </ViktorSpaceAccessProvider>
  );
}
