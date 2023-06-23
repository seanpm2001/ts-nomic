
import { AtlasUser, get_env_user } from "./user";
import { AtlasProject } from "./project";

type UUID = string;

export type OrganizationUserInfo = {
    organization_id: UUID;
    nickname: string;
    user_id: string;
    access_role: "OWNER" | "MEMBER";
};

type OrganizationInfo = {
    id: UUID;
    projects: AtlasProject[];
};

type ProjectInitOptions = {
    project_name: string;
    unique_id_field: string;
    modality: "text" | "embedding";
};

export class AtlasOrganization {
    id: UUID;
    user: AtlasUser;
    _info: OrganizationInfo | undefined = undefined;

    constructor(id: UUID, user?: AtlasUser) {
        this.id = id;
        this.user = user || get_env_user();
    }

    async info() {
        if (this._info !== undefined) {
            return this._info;
        }
        const response = await this.user.apiCall(
            `/v1/organization/${this.id}`,
            "GET"
        );
        const info = (await response.json()) as OrganizationInfo;
        this._info = info;
        return info;
    }

    async projects() {
        const info = (await this.info()) as OrganizationInfo;
        return info.projects;
    }
}