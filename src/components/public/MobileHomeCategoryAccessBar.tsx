"use client";

import { forwardRef } from "react";
import { ChevronRight, LayoutGrid } from "lucide-react";

type Props = {
  onOpen: () => void;
};

const MobileHomeCategoryAccessBar = forwardRef<HTMLButtonElement, Props>(
  function MobileHomeCategoryAccessBar({ onOpen }, ref) {
    return (
      <div className="mobile-home-cat-access">
        <div className="container">
          <button
            ref={ref}
            type="button"
            className="mobile-home-cat-access__btn"
            aria-label="Mở tất cả danh mục"
            onClick={onOpen}
          >
            <span className="mobile-home-cat-access__icon" aria-hidden="true">
              <LayoutGrid size={18} />
            </span>
            <span className="mobile-home-cat-access__text">
              <span className="mobile-home-cat-access__label">Tất cả danh mục</span>
              <span className="mobile-home-cat-access__hint">Khám phá nguồn hàng</span>
            </span>
            <ChevronRight
              size={18}
              className="mobile-home-cat-access__chevron"
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    );
  },
);

export default MobileHomeCategoryAccessBar;
