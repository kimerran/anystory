import React from "react";
const Image = ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => (
  <img src={src} alt={alt} {...(props as React.ImgHTMLAttributes<HTMLImageElement>)} />
);
export default Image;
