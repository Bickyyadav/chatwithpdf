import fs from "fs";
import path from "path";
import axios from "axios";
import { getCloudinaryUrl } from "./cloudinary";

type CloudinaryResourceType = Parameters<typeof getCloudinaryUrl>[1];

export async function downloadFromCloudinary(file_key: string, resource_type?: string) {
    try {
        const url = getCloudinaryUrl(
            file_key,
            (resource_type as CloudinaryResourceType) ?? "raw"
        );
        const response = await axios.get(url, { responseType: "arraybuffer" });

        const tempDir = path.join(process.cwd(), "tmp");
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const file_name = path.join(tempDir, `pdf-${Date.now()}.pdf`);
        console.log("😁😁😁😁 ~ downloadFromCloudinary ~ file_name:", file_name)
        fs.writeFileSync(file_name, response.data);
        return file_name;
    } catch (error) {
        console.error("Error downloading from Cloudinary:", error);
        return null;
    }
}
