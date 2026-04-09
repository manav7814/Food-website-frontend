import { ORDER_STEPS, formatOrderStatus, statusProgressIndex } from "../utils/orderStatus";

export default function OrderTimeline({ status }) {
  const activeIndex = statusProgressIndex(status);

  return (
    <div className="timeline">
      {ORDER_STEPS.map((step, index) => (
        <div key={step} className={`timeline-step ${index <= activeIndex ? "timeline-step-active" : ""}`}>
          <span className="timeline-dot" />
          <span className="timeline-label">{formatOrderStatus(step)}</span>
        </div>
      ))}
    </div>
  );
}
