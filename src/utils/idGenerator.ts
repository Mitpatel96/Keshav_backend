export const generatePermanentId = (prefix: string, num: number) => {
    return `${prefix}${(1000 + num).toString().slice(-4)}`;
  };
  
  export const generateSkuId = (title: string) => {
    const code = title.replace(/\s+/g, '-').toUpperCase().slice(0,6);
    return `${code}-${Date.now().toString().slice(-5)}`;
  };
  
  export const generateVerificationCode = () => Math.floor(10000000 + Math.random() * 90000000).toString();
  
  