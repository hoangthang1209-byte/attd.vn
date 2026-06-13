type FaqItem = {
  question: string;
  answer: string;
};

type ProductFaqListProps = {
  items: FaqItem[];
};

export default function ProductFaqList({ items }: ProductFaqListProps) {
  return (
    <div className="faq-list">
      {items.map(({ question, answer }) => (
        <details key={question} className="faq-item">
          <summary>{question}</summary>
          <div className="faq-answer">
            <p>{answer}</p>
          </div>
        </details>
      ))}
    </div>
  );
}
