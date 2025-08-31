interface PCSTagGroup {
  type: string;
  id: string;
}

interface PCSTagRelationships {
  tag_group: {
    data: PCSTagGroup;
  };
}

interface PCSTagAttributes {
  name: string;
}

interface PCSTag {
  type: string;
  id: string;
  attributes: PCSTagAttributes;
  relationships: PCSTagRelationships;
}

interface PCSTagMeta {
  total_count: number;
  count: number;
  parent: {
    id: string;
    type: string;
  };
}

export interface PCSTagResponse {
  data: PCSTag[];
  meta: PCSTagMeta;
}

interface MinisterioDTO {
  id: string;
  name: string;
}

export interface TagsMinisteriosDTO {
  ministerios: MinisterioDTO[];
  status_id: string;
  status_name: string;
}