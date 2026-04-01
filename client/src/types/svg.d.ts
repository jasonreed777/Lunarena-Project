declare module "*.svg?react" {
  import React from "react";
  const reactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  export { reactComponent as default };
}
