import { redirect } from 'next/navigation';

export default function PartnersRegisterPage() {
  redirect('/register?type=seller');
}
