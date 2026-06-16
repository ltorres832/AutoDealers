'use client';

import { FICosignerFullForm, type FICosignerFullFormProps } from '@/components/FICosignerFullForm';

export type { FICosignerFullFormProps };

export default function FICosignerForm(props: FICosignerFullFormProps) {
  return <FICosignerFullForm {...props} />;
}
