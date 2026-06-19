import { Course } from "./firestoreTypes";

export interface CourseDetailContent {
  intro: string;
  audience: string[];
  outcomeTitle: string;
  outcomes: string[];
  curriculumTitle: string;
  curriculum: string[];
}

const courseDetails: Record<string, CourseDetailContent> = {
  mobileAiBasic: {
    intro: "從手機開始建立 AI 使用習慣，適合第一次接觸 AI 的學員，用簡單、實用的方式學會生活、工作、學習與內容創作的基本應用。",
    audience: [
      "AI 初學者",
      "想用手機學習 AI 應用的學員",
      "想用 AI 協助生活、工作、學習與內容創作的人",
      "希望用簡單方式開始建立 AI 使用習慣的人",
    ],
    outcomeTitle: "學習目標",
    outcomes: [
      "了解 AI 基礎觀念與安全使用方式",
      "學會用手機完成常見 AI 應用",
      "能完成文字、圖片、聲音與簡單影片應用",
      "建立日常可持續使用的 AI 學習方法",
    ],
    curriculumTitle: "4 堂課程內容",
    curriculum: [
      "第 1 堂：AI 基礎與手機操作入門",
      "第 2 堂：AI 文字應用與生活助理",
      "第 3 堂：AI 圖像、聲音與內容創作",
      "第 4 堂：完成一支簡單 AI 作品或影片",
    ],
  },
  imageVideoCreation: {
    intro: "聚焦 AI 圖像與影片創作流程，帶學員從畫面風格、角色一致性、腳本分鏡到短影音作品完成，提升視覺內容品質與創作效率。",
    audience: [
      "已有 AI 基礎，想加強圖片與影片創作的人",
      "想做社群短影音、課程宣傳、品牌內容的人",
      "想學習 AI 圖像、影片腳本與素材規劃的人",
      "想提升視覺內容品質與創作效率的人",
    ],
    outcomeTitle: "學習目標",
    outcomes: [
      "學會 AI 圖像生成與構圖規劃",
      "學會圖像到影片的創作思路",
      "能規劃短影音腳本與分鏡",
      "完成一組可用於社群或宣傳的圖影作品",
    ],
    curriculumTitle: "4 堂課程內容",
    curriculum: [
      "第 1 堂：AI 圖像生成與風格設計",
      "第 2 堂：角色一致性與畫面構圖",
      "第 3 堂：圖像轉影片思路與短影音設計",
      "第 4 堂：完成一支 AI 圖影創作作品",
    ],
  },
  saturdayElite: {
    intro: "為平日不方便上課的學員設計，以週六時段完成精實的 AI 初階訓練，快速建立工具觀念、手機操作流程與實作基礎。",
    audience: [
      "平日不方便上課的學員",
      "想利用週六密集學習 AI 的學員",
      "希望以較精實方式完成初階訓練的人",
      "想快速建立 AI 應用基礎的人",
    ],
    outcomeTitle: "學習目標",
    outcomes: [
      "快速建立 AI 工具與應用基礎",
      "熟悉手機 AI 操作流程",
      "能完成基礎文字、圖片與內容應用",
      "建立後續進階學習基礎",
    ],
    curriculumTitle: "4 堂課程內容",
    curriculum: [
      "第 1 堂：AI 入門與手機操作",
      "第 2 堂：AI 文字與生活應用",
      "第 3 堂：AI 圖像與創作練習",
      "第 4 堂：AI 實作整合與成果完成",
    ],
  },
  oneOnOne: {
    intro: "依照學員程度、需求與目標客製化教學，協助釐清學習方向、改善實作問題，並將 AI 應用落實到工作、學習、創作或個人任務。",
    audience: [
      "希望依照個人需求客製化學習的學員",
      "有特定問題需要老師協助排解的人",
      "想提升 AI 應用能力、工作效率或內容創作能力的人",
      "希望一對一釐清學習方向與實作問題的人",
    ],
    outcomeTitle: "課程特色",
    outcomes: [
      "不分會員與非會員價",
      "NT$1,600 / 小時",
      "固定預約時段：08:30-09:30",
      "依照學員程度、需求與目標客製化教學",
      "可針對個人工作、學習、創作、簡報、社群經營、課程準備或實際問題進行一對一指導",
    ],
    curriculumTitle: "可協助主題",
    curriculum: [
      "AI 基礎觀念與正確使用方式",
      "個人工作流程優化",
      "社群內容與課程宣傳規劃",
      "圖像與影片創作思路",
      "教學備課與簡報內容整理",
      "個人作品修正與問題排解",
      "依照學員需求設計專屬學習路線",
    ],
  },
};

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, "-");
}

export function getCourseDetailContent(course: Course): CourseDetailContent {
  const keyText = normalize(`${course.slug || ""} ${course.id || ""} ${course.name || ""}`);

  if (course.type === "oneOnOne" || keyText.includes("1-對-1") || keyText.includes("oneonone")) {
    return courseDetails.oneOnOne;
  }

  if (keyText.includes("圖影") || keyText.includes("image") || keyText.includes("video") || keyText.includes("creative")) {
    return courseDetails.imageVideoCreation;
  }

  if (keyText.includes("週六") || keyText.includes("saturday") || keyText.includes("elite")) {
    return courseDetails.saturdayElite;
  }

  return courseDetails.mobileAiBasic;
}
