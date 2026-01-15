import { cn } from "@/lib/utils"
import styles from "@/components/example.module.css"

function ExampleWrapper({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={styles.wrapper}>
      <div
        data-slot="example-wrapper"
        className={cn(styles.wrapperInner, className)}
        {...props}
      />
    </div>
  )
}

function Example({
  title,
  children,
  className,
  containerClassName,
  ...props
}: React.ComponentProps<"div"> & {
  title: string
  containerClassName?: string
}) {
  return (
    <div
      data-slot="example"
      className={cn(styles.example, containerClassName)}
      {...props}
    >
      <div className={styles.exampleTitle}>
        {title}
      </div>
      <div
        data-slot="example-content"
        className={cn(styles.exampleContent, className)}
      >
        {children}
      </div>
    </div>
  )
}

export { ExampleWrapper, Example }
