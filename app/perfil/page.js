import ProfileView from "@/components/ProfileView";
import { getProfileStats } from "@/lib/profile";

export default async function PerfilPage() {
  const stats = await getProfileStats();

  return <ProfileView stats={stats} />;
}
