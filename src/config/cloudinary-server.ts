import fs from "fs";
import axios from "axios";
import { getCloudinaryUrl } from "./cloudinary";

export async function downloadFromCloudinary(file_key: string, resource_type?: string) {
    try {
        const url = getCloudinaryUrl(file_key, resource_type as any);
        const response = await axios.get(url, { responseType: "arraybuffer" });

        const file_name = `/tmp/pdf-${Date.now()}.pdf`;
        fs.writeFileSync(file_name, response.data);
        return file_name;
    } catch (error) {
        console.error("Error downloading from Cloudinary:", error);
        return null;
    }
}
