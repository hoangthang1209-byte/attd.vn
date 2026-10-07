/** Blocking editorial checks shared by every publishing path. */
export function validateEditorialCompletion(content: string | null | undefined): string[] {
  const text = (content ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/\s+/g, " ")
    .normalize("NFC");
  const errors: string[] = [];
  const unfinished = /bổ sung chi tiết khi review|(?:cần|sẽ) bổ sung (?:nội dung|chi tiết) sau|\[(?:TODO|TBD|INSERT[^\]]*|điền[^\]]*)\]|\b(?:TODO|TBD)\s*:/i;
  if (unfinished.test(text)) {
    errors.push("Nội dung còn ghi chú hoặc placeholder chưa hoàn thiện — cần biên tập trước khi xuất bản.");
  }
  const internalInstruction = /(?:không (?:được )?|thay vì )(?:tự nhận|mặc định tự nhận)[^.]{0,180}(?:chưa có bằng chứng|nếu chưa)|(?:system prompt|developer instruction|ignore previous instructions)\s*:/i;
  if (internalInstruction.test(text)) {
    errors.push("Nội dung còn hướng dẫn nội bộ — cần chuyển thành thông tin rõ ràng dành cho khách hàng.");
  }
  return errors;
}
