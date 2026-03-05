import * as React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={`flex h-9 w-full rounded-md border border-[#2a2a2a] bg-[#0f0f0f] px-3 py-1 text-sm text-white placeholder:text-[#737373] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[rgba(255,165,0,0.6)] focus-visible:border-[rgba(255,165,0,0.6)] disabled:cursor-not-allowed disabled:opacity-50 ${className || ''}`}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };