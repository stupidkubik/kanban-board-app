"use client"

import * as React from "react"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import styles from "@/features/board/ui/board-page.module.css"

type ColumnsSkeletonProps = {
  ariaLabel?: string
}

const COLUMN_COUNT = 3
const CARD_COUNT = 3

export const ColumnsSkeleton = React.memo(function ColumnsSkeleton({
  ariaLabel,
}: ColumnsSkeletonProps) {
  return (
    <div className={styles.columnsGrid} aria-busy="true" aria-label={ariaLabel}>
      {Array.from({ length: COLUMN_COUNT }).map((_, columnIndex) => (
        <Card
          key={`column-skeleton-${columnIndex}`}
          className={styles.columnCard}
          aria-hidden="true"
        >
          <CardHeader>
            <div className={styles.columnHeader}>
              <div className={`${styles.skeletonBlock} ${styles.skeletonTitle}`} />
              <div className={`${styles.skeletonBlock} ${styles.skeletonButton}`} />
            </div>
          </CardHeader>
          <CardContent className={styles.columnBody}>
            <ul className={styles.cardList}>
              {Array.from({ length: CARD_COUNT }).map((__, cardIndex) => (
                <li
                  key={`card-skeleton-${columnIndex}-${cardIndex}`}
                  className={styles.cardItem}
                >
                  <div className={`${styles.skeletonBlock} ${styles.skeletonLine}`} />
                  <div
                    className={`${styles.skeletonBlock} ${styles.skeletonLine} ${styles.skeletonLineShort}`}
                  />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  )
})
