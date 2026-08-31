package config

import (
	"encoding/json"
	"os"
	"path/filepath"
)

// Load 从指定目录加载全部配置 JSON 并构建索引。
func Load(dir string) (*ConfigSet, error) {
	cs := &ConfigSet{}
	if err := loadJSON(filepath.Join(dir, "stage.json"), &cs.Stages); err != nil {
		return nil, err
	}
	if err := loadJSON(filepath.Join(dir, "equip.json"), &cs.Equips); err != nil {
		return nil, err
	}
	if err := loadJSON(filepath.Join(dir, "pet.json"), &cs.Pets); err != nil {
		return nil, err
	}
	if err := loadJSON(filepath.Join(dir, "drop.json"), &cs.DropTables); err != nil {
		return nil, err
	}
	if err := loadJSON(filepath.Join(dir, "affix.json"), &cs.Affixes); err != nil {
		return nil, err
	}
	if err := loadJSON(filepath.Join(dir, "hang.json"), &cs.Hang); err != nil {
		return nil, err
	}
	cs.buildIndex()
	return cs, nil
}

func loadJSON(path string, v interface{}) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, v)
}

func (cs *ConfigSet) buildIndex() {
	cs.stageIdx = make(map[int32]Stage, len(cs.Stages))
	for _, s := range cs.Stages {
		cs.stageIdx[s.ID] = s
	}
	cs.equipIdx = make(map[int32]Equip, len(cs.Equips))
	for _, e := range cs.Equips {
		cs.equipIdx[e.ID] = e
	}
	cs.petIdx = make(map[int32]Pet, len(cs.Pets))
	for _, p := range cs.Pets {
		cs.petIdx[p.ID] = p
	}
	cs.dropIdx = make(map[int32]DropTable, len(cs.DropTables))
	for _, t := range cs.DropTables {
		cs.dropIdx[t.ID] = t
	}
	cs.affixIdx = make(map[int32]Affix, len(cs.Affixes))
	for _, a := range cs.Affixes {
		cs.affixIdx[a.ID] = a
	}
}
