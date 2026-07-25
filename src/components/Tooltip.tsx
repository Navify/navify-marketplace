import React from "react";

export default function Tooltip({ children, ...args }: Partial<Navify.ReactComponent.TooltipProps>) {
  if (Navify.ReactComponent.TooltipWrapper) {
    return <Navify.ReactComponent.TooltipWrapper {...args}>{children}</Navify.ReactComponent.TooltipWrapper>;
  }

  return children;
}
