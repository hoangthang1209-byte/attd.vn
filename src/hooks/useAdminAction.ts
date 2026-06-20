import { useAdminLoading } from "@/components/admin/AdminLoadingProvider";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import {
  runAdminMutation,
  type AdminMutationContext,
  type RunAdminMutationOptions,
} from "@/lib/admin/adminMutation";

export function useAdminAction(): AdminMutationContext {
  const loading = useAdminLoading();
  const toast = useAdminToast();
  return { loading, toast };
}

export function useAdminMutation() {
  const ctx = useAdminAction();

  return async function mutate<T>(
    options: RunAdminMutationOptions<T>,
  ): Promise<T | null> {
    return runAdminMutation(ctx, options);
  };
}
