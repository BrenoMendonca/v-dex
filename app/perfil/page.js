import { auth } from "@/auth";
import AuthForm from "@/components/AuthForm";
import ProfileView from "@/components/ProfileView";
import { getProfileStats } from "@/lib/profile";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";

export default async function PerfilPage() {
  const session = await auth();

  if (!session?.user) {
    return <AuthForm />;
  }

  await dbConnect();
  const userDoc = await User.findById(session.user.id).lean();
  const stats = await getProfileStats();

  return (
    <ProfileView
      stats={stats}
      user={{ login: session.user.login, avatar: userDoc?.avatar ?? null }}
    />
  );
}
