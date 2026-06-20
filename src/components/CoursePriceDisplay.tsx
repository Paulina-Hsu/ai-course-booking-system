import { Course } from "@/lib/firestoreTypes";
import { getCoursePriceNumber } from "@/lib/firestoreService";

interface CoursePriceDisplayProps {
  course: Course;
  className?: string;
  itemClassName?: string;
}

function formatCurrency(value: number) {
  return `NT$${new Intl.NumberFormat("zh-TW").format(value)}`;
}

export function CoursePriceDisplay({ course, className = "", itemClassName = "" }: CoursePriceDisplayProps) {
  if (course.type === "oneOnOne") {
    return (
      <span className={`whitespace-nowrap ${className}`}>
        費用：{formatCurrency(getCoursePriceNumber(course.pricePerHour, course.memberPrice, course.nonMemberPrice))}／小時
      </span>
    );
  }

  return (
    <div className={`flex flex-wrap gap-x-4 gap-y-1 ${className}`}>
      <span className={`whitespace-nowrap ${itemClassName}`}>
        會員價：{formatCurrency(getCoursePriceNumber(course.memberPrice))}
      </span>
      <span className={`whitespace-nowrap ${itemClassName}`}>
        非會員價：{formatCurrency(getCoursePriceNumber(course.nonMemberPrice))}
      </span>
    </div>
  );
}
