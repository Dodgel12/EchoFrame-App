import { AuthProvider } from "../lib/auth-context";
import RootNavigator from "./root-navigator";

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
