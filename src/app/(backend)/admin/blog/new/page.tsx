import { Suspense } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import BlogPostEditor from "@/components/admin/BlogPostEditor";
import { SectionLoading } from "@/components/ui/loading/ContextLoading";

export default function NewBlogPostPage() {
  return (
    <>
      <AdminPageTitle title={"Blog — Bài viết mới"} />
      <Suspense
        fallback={
          <SectionLoading
            title="Đang tải trình soạn thảo blog…"
            description="Chuẩn bị công cụ viết bài và thư viện media."
            tone="admin"
          />
        }
      >
        <BlogPostEditor mode="create" />
      </Suspense>
    </>
  );
}
