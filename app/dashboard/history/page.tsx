// Redirect history to roadmaps
import { redirect } from 'next/navigation';

export default function HistoryRedirect() {
  redirect('/dashboard/roadmaps');
}
