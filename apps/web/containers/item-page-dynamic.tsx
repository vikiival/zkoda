import dynamic from "next/dynamic";

export default dynamic(() => import("./item-page"), {
  ssr: false,
});
