export const apiResponse = async (statusCode: number, message: string, data: any, error: any) => {
  return {
    statusCode,
    message,
    data,
    error
  };
};

export const URL_decode = (url) => {
    let folder_name = [], image_name
    url.split("/").map((value, index, arr) => {
        image_name = url.split("/")[url.split("/").length - 1]
        folder_name = (url.split("/"))
        folder_name.splice(url.split("/").length - 1, 1)
    })
    return [folder_name.join('/'), image_name]
}