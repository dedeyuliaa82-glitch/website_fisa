import { redirect } from "next/navigation";

/** Menu rekening digabung ke Pengaturan Finansial. */
export default function RekeningRedirect() {
  redirect("/pengaturan?tab=rekening");
}
