import Ihayo from '@/components/Ihayo';
import { voiceConfiguration } from '@/lib/voice/proxy';
export default function Page() {
  let voiceAvailable = false;
  try {
    voiceConfiguration();
    voiceAvailable = true;
  } catch {
    /* Voice remains visibly unavailable until configured and released. */
  }
  return <Ihayo voiceAvailable={voiceAvailable} />;
}
